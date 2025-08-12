export default function Card({ children }) {
  return (
    <div className="bg-slate-900/60 rounded-2xl shadow p-4 border border-slate-800/60">
      {children}
    </div>
  );
}


