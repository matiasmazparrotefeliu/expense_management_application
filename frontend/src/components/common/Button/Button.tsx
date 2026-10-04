import { type ReactNode, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 focus:ring-gray-500 text-gray-700 border border-gray-300',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 focus:ring-gray-500 text-gray-700',
  success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  type = 'button',
  disabled = false,
  className = '',
  onClick,
  variant = 'primary',
  size = 'md',
  title,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`w-full rounded-md shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
