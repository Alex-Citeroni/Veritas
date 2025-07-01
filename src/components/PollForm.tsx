'use client';

import { useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Loader2, Send } from 'lucide-react';

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
  question: z.string().min(5, 'Question must be at least 5 characters long.'),
  answers: z.array(z.object({ text: z.string().min(1, 'Answer cannot be empty.') })).min(2, 'At least two answers are required.'),
});

type PollFormValues = z.infer<typeof pollFormSchema>;

interface PollFormProps {
  currentPoll: Poll;
}

export function PollForm({ currentPoll }: PollFormProps) {
  const [isSubmitting, startSubmitting] = useTransition();
  const [isEnding, startEnding] = useTransition();
  const { toast } = useToast();

  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      question: currentPoll?.question || '',
      answers: currentPoll?.answers?.length ? currentPoll.answers.map(a => ({ text: a.text })) : [{ text: '' }, { text: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'answers',
  });

  const onSubmit = (data: PollFormValues) => {
    startSubmitting(async () => {
      const formData = new FormData();
      formData.append('question', data.question);
      data.answers.forEach(answer => {
        formData.append('answers[]', answer.text);
      });

      const result = await createPoll(formData);
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
        form.reset({ question: '', answers: [{ text: '' }, { text: '' }] });
      }
    });
  };

  const hasActivePoll = !!currentPoll?.question;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Create or Manage Poll</CardTitle>
        <CardDescription>
          {hasActivePoll ? `Current poll: "${currentPoll.question}"` : 'Create a new poll for your audience.'}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poll Question</FormLabel>
                  <FormControl>
                    <Input placeholder="What's your favorite framework?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Answers</FormLabel>
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`answers.${index}.text`}
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
