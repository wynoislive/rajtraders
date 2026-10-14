import React, { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { cleanMobileInput, formatMobileInputGroup, isValidIndianMobile } from '../utils/phone';

interface MobileNumberInputProps {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (cleanDigits: string) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const MobileNumberInput: React.FC<MobileNumberInputProps> = ({
  id = 'mobileNumber',
  name = 'mobileNumber',
  defaultValue = '',
  value: controlledValue,
  onChange,
  required = true,
  disabled = false,
  label = 'Mobile Number',
  className = '',
}) => {
  const isControlled = controlledValue !== undefined;
  const [internalDigits, setInternalDigits] = useState(() => cleanMobileInput(defaultValue));

  const digits = isControlled ? cleanMobileInput(controlledValue || '') : internalDigits;

  useEffect(() => {
    if (!isControlled && defaultValue) {
      setInternalDigits(cleanMobileInput(defaultValue));
    }
  }, [defaultValue, isControlled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = cleanMobileInput(raw);
    if (!isControlled) {
      setInternalDigits(clean);
    }
    if (onChange) {
      onChange(clean);
    }
  };

  const isValid = isValidIndianMobile(digits);
  const startsWithInvalidDigit = digits.length > 0 && !['6', '7', '8', '9'].includes(digits[0]);
  const formattedDisplay = formatMobileInputGroup(digits);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-extrabold text-[#0E3D42]">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <span className="text-[10px] font-semibold text-gray-400">
            {digits.length}/10 digits
          </span>
        </div>
      )}

      {/* Hidden input to ensure native form submission (formData.get('mobileNumber')) always gets the clean 10-digit string */}
      <input type="hidden" name={name} value={digits} />

      <div
        className={`group relative flex items-center rounded-xl border bg-white transition-all shadow-sm ${
          isValid
            ? 'border-emerald-500 ring-2 ring-emerald-500/10'
            : startsWithInvalidDigit
            ? 'border-amber-400 ring-2 ring-amber-400/10'
            : 'border-gray-300 focus-within:border-[#0E3D42] focus-within:ring-2 focus-within:ring-[#0E3D42]/10'
        } ${disabled ? 'opacity-60 bg-gray-50 cursor-not-allowed' : ''}`}
      >
        {/* Country Code Prefix Badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-50/80 border-r border-gray-200 rounded-l-xl select-none"
          title="Republic of India (+91)"
        >
          <span className="text-base leading-none" role="img" aria-label="India Flag">
            🇮🇳
          </span>
          <span className="text-xs font-extrabold text-gray-700 tracking-tight">
            +91
          </span>
        </div>

        {/* Formatted Number Input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[0-9]*"
          maxLength={11} // 10 digits + 1 space for mask
          disabled={disabled}
          required={required}
          value={formattedDisplay}
          onChange={handleChange}
          placeholder="98765 43210"
          className="w-full bg-transparent px-3 py-2.5 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none tracking-wide"
        />

        {/* Trailing Status Indicator */}
        <div className="pr-3 flex items-center">
          {isValid ? (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 animate-in fade-in zoom-in duration-150"
              title="Valid 10-digit mobile number"
            >
              <Check size={12} strokeWidth={3} />
            </span>
          ) : startsWithInvalidDigit ? (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700"
              title="Must begin with 6, 7, 8, or 9"
            >
              <AlertCircle size={12} strokeWidth={2.5} />
            </span>
          ) : null}
        </div>
      </div>

      {/* Helper text if invalid first digit */}
      {startsWithInvalidDigit && (
        <p className="text-[11px] font-medium text-amber-700 flex items-center gap-1 mt-0.5">
          <AlertCircle size={12} className="shrink-0" />
          Indian mobile numbers must begin with 6, 7, 8, or 9.
        </p>
      )}
    </div>
  );
};
