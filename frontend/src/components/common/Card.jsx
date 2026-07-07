function Card({ children, className = "" }) {
  return (
    <div className={`rounded-[28px] border border-[rgba(18,20,28,0.08)] bg-[var(--imc-surface)] p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export default Card;
