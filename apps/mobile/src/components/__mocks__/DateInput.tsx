// Mock DateInput for testing
import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

export interface DateInputProps extends Omit<TextInputProps, 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChangeText,
  placeholder,
  ...props
}) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      testID="date-input"
      {...props}
    />
  );
};
