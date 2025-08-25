import { cn } from './cn';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};
export function Button({ className, variant='primary', ...props }: Props) {
  return (
    <button className={cn('btn', variant === 'primary' ? 'btn-primary' : 'btn-ghost', className)} {...props} />
  );
}
