function Button({ children, onClick, type = "button", variant = "primary", className = "" }) {
  const styles = {
    primary: "bg-[#4338CA] text-white",
    accent: "bg-[#EC9A1E] text-[var(--imc-text)]",
    secondary: "bg-[#ECEBF9] text-[var(--imc-indigo-text)]",
    dark: "bg-[#12141C] text-white",
    outline: "border border-[rgba(18,20,28,0.12)] bg-[var(--imc-surface)] text-[var(--imc-text)]",
    danger: "bg-[#FEF3F2] text-[#D92D20]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`h-12 rounded-2xl px-5 text-[14px] font-black active:scale-[0.98] ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
