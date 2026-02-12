const Kbd = ({ children }: { children: React.ReactNode }) => {
  return (
    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/30 bg-black px-1.5 font-mono text-[10px] font-medium text-white/70 opacity-100">
      {children}
    </kbd>
  )
}

export default Kbd
