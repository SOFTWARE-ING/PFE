// =============================
// File: src/components/ui/Card.tsx
// =============================
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="
      bg-card-light dark:bg-card-dark
      border border-border-light dark:border-border-dark
      shadow-xl shadow-blue-500/5
      backdrop-blur-md
      rounded-2xl p-8 w-full max-w-md
      transition-all duration-300
    ">
      {children}
    </div>
  );
};

export default Card;