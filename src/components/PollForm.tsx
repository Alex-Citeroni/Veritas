'use client';

import { useTransition } from 'react';
import { useForm, useFieldArray, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Send, FilePlus2, GripVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createPoll, endPoll } from '@/lib/actions';
import type { Poll } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const pollFormSchema = z.object({
  title: z.string().min(3, 'Il titolo deve contenere almeno 3 caratteri.'),
  questions: z.array(
    z.object({
      text: z.string().min(5, 'La domanda deve contenere almeno 5 caratteri.'),
      answers: z.array(z.object({ text: z.string().min(1, 'La risposta non può essere vuota.') })).min(2, 'Sono necessarie almeno due risposte.'),
    })
  ).min(1, 'È richiesta almeno una domanda.'),
});

type PollFormValues = z.infer<typeof pollFormSchema>;

interface PollFormProps {
  currentPoll: Poll;
  username: string;
}

interface SortableAnswerProps {
    control: Control<PollFormValues>;
    questionIndex: number;
    answerIndex: number;
    field: Record<"id", string>;
    remove: (index: number) => void;
    isSubmitting: boolean;
    totalAnswers: number;
}

function SortableAnswer({ control, questionIndex, answerIndex, field, remove, isSubmitting, totalAnswers }: SortableAnswerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-background rounded-md">
       <div {...attributes} {...listeners} className="p-2 cursor-grab touch-none" aria-label="Riordina risposta">
         <GripVertical className="h-5 w-5 text-muted-foreground" />
       </div>
       <FormField
          control={control}
          name={`questions.${questionIndex}.answers.${answerIndex}.text`}
          render={({ field: formField }) => (
            <FormItem className="flex-grow">
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input placeholder={`Opzione di risposta ${answerIndex + 1}`} {...formField} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(answerIndex)}
                    disabled={totalAnswers <= 2 || isSubmitting}
                    aria-label="Rimuovi risposta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
    </div>
  )
}


function AnswersFieldArray({ control, questionIndex, isSubmitting }: { control: Control<PollFormValues>, questionIndex: number, isSubmitting: boolean }) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `questions.${questionIndex}.answers`,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id);
      const newIndex = fields.findIndex((item) => item.id === over.id);
      move(oldIndex, newIndex);
    }
  }

  return (
    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
      <FormLabel>Risposte per la Domanda {questionIndex + 1}</FormLabel>
       <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {fields.map((field, index) => (
                <SortableAnswer
                    key={field.id}
                    field={field}
                    control={control}
                    questionIndex={questionIndex}
                    answerIndex={index}
                    remove={remove}
                    isSubmitting={isSubmitting}
                    totalAnswers={fields.length}
                />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ text: '' })}
        disabled={isSubmitting}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Aggiungi Risposta
      </Button>
    </div>
  );
}

export function PollForm({ currentPoll, username }: PollFormProps) {
  const [isSubmitting, startSubmitting] = useTransition();
  const [isEnding, startEnding] = useTransition();
  const { toast } = useToast();

  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      title: currentPoll?.title || '',
      questions: currentPoll?.questions?.length ? currentPoll.questions.map(q => ({ text: q.text, answers: q.answers.map(a => ({ text: a.text })) })) : [{ text: '', answers: [{ text: '' }, { text: '' }] }],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: 'questions',
  });
  
  const hasActivePoll = !!currentPoll?.title;

  const onSubmit = (data: PollFormValues) => {
    startSubmitting(async () => {
      try {
        await createPoll(data, hasActivePoll, username);
      } catch (e) {
        const error = e as Error;
         toast({ variant: 'destructive', title: 'Errore', description: error.message || "Qualcosa è andato storto." });
      }
    });
  };
  
  const handleEndPoll = () => {
    startEnding(async () => {
      const result = await endPoll(username);
       if (result.error) {
        toast({ variant: 'destructive', title: 'Errore', description: result.error });
      } else {
        toast({ title: 'Successo', description: result.success });
        form.reset({ title: '', questions: [{ text: '', answers: [{ text: '' }, { text: '' }] }] });
      }
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Crea o Gestisci Sondaggio</CardTitle>
        <CardDescription>
          {hasActivePoll ? `Sondaggio attuale: "${currentPoll.title}"` : 'Crea un nuovo sondaggio per il tuo pubblico.'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolo del Sondaggio</FormLabel>
                  <FormControl>
                    <Input placeholder="Es. Feedback settimanale del team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Domande</FormLabel>
              {questionFields.map((questionField, questionIndex) => (
                <Card key={questionField.id} className="bg-secondary/50 p-4">
                  <div className="flex justify-between items-start mb-4">
                    <FormField
                      control={form.control}
                      name={`questions.${questionIndex}.text`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormLabel>Domanda {questionIndex + 1}</FormLabel>
                          <FormControl>
                            <Input placeholder="Qual è il tuo framework preferito?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(questionIndex)}
                        disabled={questionFields.length <= 1 || isSubmitting}
                        className="ml-2 mt-8"
                        aria-label="Rimuovi domanda"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                  </div>
                  
                  <AnswersFieldArray control={form.control} questionIndex={questionIndex} isSubmitting={isSubmitting} />
                </Card>
              ))}
               <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendQuestion({ text: '', answers: [{ text: '' }, { text: '' }] })}
                disabled={isSubmitting}
                className="mt-2"
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                Aggiungi Domanda
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!hasActivePoll || isSubmitting || isEnding}>Termina Sondaggio Attuale</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questo terminerà il sondaggio attuale, salverà i risultati e preparerà il campo per un nuovo sondaggio. Questa azione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndPoll} disabled={isEnding}>
                    {isEnding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Termina e Salva
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {hasActivePoll ? 'Aggiorna Sondaggio' : 'Crea Sondaggio'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
