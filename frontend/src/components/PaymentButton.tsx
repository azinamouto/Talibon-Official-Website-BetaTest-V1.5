/** Legacy payment UI is intentionally inert until server-side settlement is qualified. */
interface PaymentButtonProps {
  itemName: string;
  amount: number;
  className?: string;
  label?: string;
}
export default function PaymentButton({ className = "" }: PaymentButtonProps) {
  return (
    <p role="status" className={`rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 ${className}`}>
      Online payment is currently unavailable. Please contact the responsible municipal office for verified fees and approved payment instructions.
    </p>
  );
}
