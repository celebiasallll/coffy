export default function Button({ children, variant = 'primary', size = 'md', ...props }) {
  const baseStyles = 'rounded-full font-semibold transition duration-300';
  const variants = {
    primary: 'bg-[#D4A017] text-white hover:bg-[#A77B06]',
    secondary: 'bg-[#3A2A1E] text-[#E8D5B5] hover:bg-[#1A0F0A]',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
}