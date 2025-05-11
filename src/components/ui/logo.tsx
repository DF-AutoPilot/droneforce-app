import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  linkToHome?: boolean;
}

export function Logo({ size = 'sm', linkToHome = true }: LogoProps) {
  // Size mappings
  const sizeMap = {
    sm: { width: 40, height: 40, containerClass: 'w-10 h-10' },
    md: { width: 64, height: 64, containerClass: 'w-16 h-16' },
    lg: { width: 80, height: 80, containerClass: 'w-20 h-20' },
  };
  
  const { width, height, containerClass } = sizeMap[size];
  
  const logoElement = (
    <div className={`relative ${containerClass}`}>
      <Image 
        src="/dfautopilot-logo-1.png" 
        alt="DroneForce Protocol" 
        width={width} 
        height={height}
        className="rounded-lg filter invert"
      />
    </div>
  );
  
  if (linkToHome) {
    return (
      <Link href="/">
        <div className="flex items-center gap-3">
          {logoElement}
        </div>
      </Link>
    );
  }
  
  return logoElement;
}
