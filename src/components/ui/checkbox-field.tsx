"use client";

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import theme from '@/styles/theme';

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  helpText?: string;
}

export function CheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
  helpText
}: CheckboxFieldProps) {
  return (
    <div className="flex items-start space-x-2">
      <Checkbox 
        id={id} 
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
      />
      <div className="grid gap-1">
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none text-white"
        >
          {label}
        </label>
        {helpText && (
          <p className="text-xs text-neutral-400">{helpText}</p>
        )}
      </div>
    </div>
  );
}
