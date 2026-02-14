const StatsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="max-w-xl xl:max-w-7xl mx-auto w-full px-1 p-2 sm:p-4 flex-1 flex flex-col pb-8">
      {children}
    </div>
  )
}

export default StatsLayout
