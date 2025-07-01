'use client';

import { useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Send, FilePlus2 } from 'lucide-react';

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

const pollFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  questions: z.array(
    z.object({
      text: z.string().min(5, 'Question must be at least 5 characters long.'),
      answers: z.array(z.object({ text: z.string().min(1, 'Answer cannot be empty.') })).min(2, 'At least two answers are required.'),
    })
  ).min(1, 'At least one question is required.'),
});

type PollFormValues = z.infer<typeof pollFormSchema>;

interface PollFormProps {
  currentPoll: Poll;
}

function AnswersFieldArray({ control, questionIndex, isSubmitting }: { control: any, questionIndex: number, isSubmitting: boolean }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.answers`,
  });

  return (
    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
      <FormLabel>Answers for Question {questionIndex + 1}</FormLabel>
      {fields.map((field, index) => (
        <FormField
          key={field.id}
          control={control}
          name={`questions.${questionIndex}.answers.${index}.text`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input placeholder={`Answer option ${index + 1}`} {...field} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 2 || isSubmitting}
                    aria-label="Remove answer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ text: '' })}
        disabled={isSubmitting}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Answer
      </Button>
    </div>
  );
}

export function PollForm({ currentPoll }: PollFormProps) {
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

  const onSubmit = (data: PollFormValues) => {
    startSubmitting(async () => {
      const result = await createPoll(data);
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Success', description: result.success });
      }
    });
  };
  
  const handleEndPoll = () => {
    startEnding(async () => {
      const result = await endPoll();
       if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Success', description: result.success });
        form.reset({ title: '', questions: [{ text: '', answers: [{ text: '' }, { text: '' }] }] });
      }
    });
  };

  const hasActivePoll = !!currentPoll?.title;

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Create or Manage Poll</CardTitle>
        <CardDescription>
          {hasActivePoll ? `Current poll: "${currentPoll.title}"` : 'Create a new poll for your audience.'}
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
                  <FormLabel>Poll Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Weekly Team Feedback" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Questions</FormLabel>
              {questionFields.map((questionField, questionIndex) => (
                <Card key={questionField.id} className="bg-secondary/50 p-4">
                  <div className="flex justify-between items-start mb-4">
                    <FormField
                      control={form.control}
                      name={`questions.${questionIndex}.text`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormLabel>Question {questionIndex + 1}</FormLabel>
                          <FormControl>
                            <Input placeholder="What's your favorite framework?" {...field} />
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
                        aria-label="Remove question"
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
                Add Question
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!hasActivePoll || isSubmitting || isEnding}>End Current Poll</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will end the current poll, save the results, and clear the board for a new poll. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndPoll} disabled={isEnding}>
                    {isEnding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    End Poll & Save
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {hasActivePoll ? 'Update Poll' : 'Create Poll'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
