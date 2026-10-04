type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  message: string;
  variant?: AlertVariant;
}

const variantStyles: Record<AlertVariant, string> = {
  error: 'bg-red-50 text-red-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
  info: 'bg-blue-50 text-blue-700',
};

export function Alert({ message, variant = 'error' }: AlertProps) {
  return (
    <div className={`rounded-md p-4 mb-4 ${variantStyles[variant]}`}>
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}
