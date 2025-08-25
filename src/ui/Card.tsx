import { cn } from './cn';
export function Card({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('card', className)}>{children}</div>;
}
