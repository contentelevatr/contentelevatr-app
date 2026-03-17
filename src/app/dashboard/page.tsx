export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to ContentElevatr. Your social media command center.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Posts", value: "—", icon: "📄" },
          { label: "Scheduled", value: "—", icon: "📅" },
          { label: "Published", value: "—", icon: "✅" },
          { label: "Engagement", value: "—", icon: "💬" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{stat.icon}</span>
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
