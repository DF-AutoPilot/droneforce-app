/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import theme from '@/styles/theme';

export interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  required?: boolean;
  min?: string;
  step?: string;
  helpText?: string;
  error?: string;
  className?: string;
}

export function FormField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  min,
  step,
  helpText,
  error,
  className
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="text-sm font-medium text-white">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {helpText && (
          <span className="text-xs text-neutral-400">{helpText}</span>
        )}
      </div>
      
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        step={step}
        className={`border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-500 ${
          error ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500 focus:ring-blue-500/10'
        } ${className || ''}`}
      />
      
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
