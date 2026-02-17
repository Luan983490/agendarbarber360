import { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export interface IconProps extends LucideProps {
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>;
}

/**
 * Wrapper component for Lucide icons with thinner, more modern stroke
 * Default strokeWidth is 1.5 for a refined look
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ icon: IconComponent, strokeWidth = 1.5, size = 32, color = 'currentColor', ...props }, ref) => {
    return <IconComponent ref={ref} strokeWidth={strokeWidth} size={size} color={color} {...props} />;
    return <IconComponent ref={ref} strokeWidth={strokeWidth} size={size} {...props} />;
  }
);

Icon.displayName = 'Icon';

/**
 * HOC to create a thin version of any Lucide icon
 */
export function withThinStroke<T extends LucideProps>(
  IconComponent: React.ForwardRefExoticComponent<Omit<T, 'ref'> & React.RefAttributes<SVGSVGElement>>
) {
  return forwardRef<SVGSVGElement, Omit<T, 'ref'>>((props, ref) => (
    <IconComponent ref={ref} strokeWidth={1.5} {...(props as any)} />
  ));
}
