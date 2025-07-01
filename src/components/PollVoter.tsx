'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { getPoll, submitVote } from '@/lib/actions';
import type { Poll } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, BarChart2 } from 'lucide-react';

export function PollVoter() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votedAnswerId, setVotedAnswerId] = useState<number | null>(null);
  const [isVoting, startVoting] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const currentPoll = await getPoll();
        setPoll(currentPoll);
      } catch (error) {
        console.error("Failed to fetch poll:", error);
      }
    };

    fetchPoll();
    const interval = setInterval(fetchPoll, 3000);

    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (poll?.question) {
        try {
            const storedVote = localStorage.getItem(`voted_${poll.question}`);
            if(storedVote) {
                setVotedAnswerId(parseInt(storedVote, 10));
            } else {
                setVotedAnswerId(null);
            }
        } catch (error) {
            console.error("Failed to read from localStorage", error);
        }
    }
  }, [poll?.question]);

  const handleVote = (answerId: number) => {
    if (!poll?.question) return;

    startVoting(async () => {
      await submitVote(answerId);
      try {
        localStorage.setItem(`voted_${poll.question!}`, answerId.toString());
      } catch (error) {
        console.error("Failed to write to localStorage", error);
      }
      setVotedAnswerId(answerId);
      toast({
        title: 'Vote Cast!',
        description: 'Thank you for your participation.',
        className: 'bg-primary text-primary-foreground',
      });
    });
  };

  const totalVotes = useMemo(() => {
    return poll?.answers.reduce((sum, answer) => sum + answer.votes, 0) || 0;
  }, [poll?.answers]);
  
  const sortedAnswers = useMemo(() => {
    if (!poll?.answers) return [];
    return [...poll.answers].sort((a, b) => b.votes - a.votes);
  }, [poll?.answers]);

  if (poll === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-primary">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="mt-4 text-lg">Loading Poll...</p>
      </div>
    );
  }

  if (!poll.question) {
    return (
      <Card className="w-full max-w-2xl mx-auto text-center shadow-lg">
        <CardHeader>
          <CardTitle>No Active Poll</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">The admin hasn't started a poll yet. Please stand by!</p>
        </CardContent>
      </Card>
    );
  }

  const hasVoted = votedAnswerId !== null;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">{poll.question}</CardTitle>
        <CardDescription className="flex items-center justify-center gap-2 pt-2">
            <BarChart2 className="h-4 w-4" />
            Total Votes: {totalVotes}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hasVoted ? (
             <div className="space-y-3 pt-2">
              {sortedAnswers.map((answer) => {
                const percentage = totalVotes > 0 ? (answer.votes / totalVotes) * 100 : 0;
                const isUserChoice = answer.id === votedAnswerId;
                return (
                  <div key={answer.id} className="relative w-full h-12 rounded-md bg-secondary overflow-hidden border border-border">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${isUserChoice ? 'bg-accent' : 'bg-primary/80'}`}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-4 font-medium">
                        <div className={`flex items-center gap-2 ${isUserChoice ? 'text-accent-foreground' : 'text-primary-foreground mix-blend-difference'}`}>
                             {isUserChoice && <CheckCircle className="h-5 w-5" />}
                             <span>{answer.text}</span>
                        </div>
                        <span className={`${isUserChoice ? 'text-accent-foreground' : 'text-primary-foreground mix-blend-difference'}`}>{answer.votes} ({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-center text-sm text-muted-foreground pt-4">You have voted. Results are updated in real-time.</p>
            </div>
          ) : (
            sortedAnswers.map((answer) => (
              <Button
                key={answer.id}
                onClick={() => handleVote(answer.id)}
                className="w-full h-14 text-lg justify-center"
                variant="outline"
                disabled={isVoting}
              >
                {isVoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {answer.text}
              </Button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
