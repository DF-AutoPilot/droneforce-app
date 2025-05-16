"use client";

import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface FormProps {
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  footer?: ReactNode;
  className?: string;
}

export function Form({
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting = false,
  footer,
  className = ''
}: FormProps) {
  return (
    <Card className={`w-full border border-neutral-800 bg-neutral-950/80 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl text-white">{title}</CardTitle>
        {description && (
          <CardDescription className="text-neutral-400">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {children}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : submitLabel}
          </Button>
          {footer}
        </CardFooter>
      </form>
    </Card>
  );
}
