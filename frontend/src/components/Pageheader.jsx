export default function PageHeader({ eyebrow, title, children }) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow ? <p className="text-sm font-medium text-accent">{eyebrow}</p> : null}
                <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
            </div>
            {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
        </header>
    )
}