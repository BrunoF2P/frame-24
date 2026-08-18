import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | string[] | null;
}

const Input: React.FC<InputProps> = ({ label, name, error, ...props }) => {
  const errorMessage = Array.isArray(error) ? error : error;

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-300 mb-1"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
          className={`w-full px-4 py-2 bg-gray-800 text-white border rounded-md focus:outline-none transition-all duration-200
          ${
            errorMessage
              ? "border-accent-red focus:border-accent-red-hover"
              : "border-gray-600 focus:border-accent-gold focus:ring-1 focus:ring-accent-gold/40"
          }`}
        {...props}
      />
      {errorMessage && (
        <p className="mt-1 text-sm text-red-400">{errorMessage}</p>
      )}
    </div>
  );
};

export default Input;
