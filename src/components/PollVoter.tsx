'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { getPoll, submitVote } from '@/lib/actions';
import type { Poll, Question } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, BarChart2, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';

function PollQuestion({
  question,
  onVote,
  isVoting,
  votedAnswerId,
  totalVotes,
}: {
  question: Question;
  onVote: (questionId: number, answerId: number) => void;
  isVoting: boolean;
  votedAnswerId: number | null;
  totalVotes: number;
}) {
  const hasVoted = votedAnswerId !== null;

  const sortedAnswers = useMemo(() => {
    if (!question.answers) return [];
    if (hasVoted) {
      return [...question.answers].sort((a, b) => b.votes - a.votes);
    }
    return question.answers;
  }, [question.answers, hasVoted]);
  
  return (
    <Card className="w-full mx-auto shadow-md mb-6 border">
        <CardHeader className="text-left">
            <CardTitle className="text-2xl font-semibold flex items-start gap-2">
              <HelpCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <span>{question.text}</span>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 pt-2 pl-8">
                <BarChart2 className="h-4 w-4" />
                Voti totali: {totalVotes}
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
                        className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${isUserChoice ? 'bg-accent' : 'bg-primary/20'}`}
                        style={{ width: `${percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-4 font-medium text-secondary-foreground">
                            <div className="flex items-center gap-2">
                                {isUserChoice && <CheckCircle className="h-5 w-5 text-primary" />}
                                <span>{answer.text}</span>
                            </div>
                            <span>{answer.votes} ({percentage.toFixed(0)}%)</span>
                        </div>
                    </div>
                    );
                })}
                </div>
            ) : (
                sortedAnswers.map((answer) => (
                <Button
                    key={answer.id}
                    onClick={() => onVote(question.id, answer.id)}
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


export function PollVoter() {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votedAnswers, setVotedAnswers] = useState<Record<number, number>>({});
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
    if (poll?.title) {
        try {
            const storedVotesRaw = localStorage.getItem(`voted_${poll.title}`);
            if (storedVotesRaw) {
                const votes = JSON.parse(storedVotesRaw);
                
                const questionIdsInStorage = Object.keys(votes).map(Number);
                const allQuestionsValid = questionIdsInStorage.every(qId => {
                    const question = poll.questions.find(q => q.id === qId);
                    if (!question) return false;
                    const answerId = votes[qId];
                    return question.answers.some(a => a.id === answerId);
                });

                if (allQuestionsValid) {
                    setVotedAnswers(votes);
                } else {
                    setVotedAnswers({});
                    localStorage.removeItem(`voted_${poll.title}`);
                }
            } else {
                setVotedAnswers({});
            }
        } catch (error) {
            console.error("Failed to read or parse from localStorage", error);
            setVotedAnswers({});
        }
    } else {
        setVotedAnswers({});
    }
  }, [poll]);

  const handleVote = (questionId: number, answerId: number) => {
    if (!poll?.title) return;

    startVoting(async () => {
      await submitVote(questionId, answerId);
      const newVotedAnswers = { ...votedAnswers, [questionId]: answerId };
      try {
        localStorage.setItem(`voted_${poll.title!}`, JSON.stringify(newVotedAnswers));
      } catch (error) {
        console.error("Failed to write to localStorage", error);
      }
      setVotedAnswers(newVotedAnswers);
      toast({
        title: 'Voto Inviato!',
        description: 'Grazie per la tua partecipazione.',
        className: 'bg-primary text-primary-foreground',
      });
    });
  };
  
  const questionVoteTotals = useMemo(() => {
      const totals: Record<number, number> = {};
      if (!poll?.questions) return totals;
      for (const question of poll.questions) {
          totals[question.id] = question.answers.reduce((sum, answer) => sum + answer.votes, 0);
      }
      return totals;
  }, [poll?.questions])


  if (poll === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-primary">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="mt-4 text-lg">Caricamento Sondaggio...</p>
      </div>
    );
  }

  if (!poll.title) {
    return (
       <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
            <ShieldCheck className="w-16 h-16 text-primary" />
            <h1 className="text-6xl font-bold text-primary">Veritas</h1>
        </div>
        <p className="text-xl text-muted-foreground">Sondaggi interattivi per la verità.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
        <header className="absolute top-4 left-4 flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>Veritas</span>
        </header>
        
        <div className="text-center">
            <Sparkles className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-4xl font-bold mt-2 mb-2 text-primary">{poll.title}</h1>
            <p className="text-center text-muted-foreground mb-8">I risultati si aggiornano in tempo reale. Puoi votare per ogni domanda.</p>
        </div>

        {poll.questions.map((question) => (
            <PollQuestion 
                key={question.id}
                question={question}
                onVote={handleVote}
                isVoting={isVoting}
                votedAnswerId={votedAnswers[question.id] ?? null}
                totalVotes={questionVoteTotals[question.id] ?? 0}
            />
        ))}
    </div>
  );
}
