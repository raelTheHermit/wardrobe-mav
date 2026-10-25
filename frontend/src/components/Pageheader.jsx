export default function PageHeader({ eyebrow, title, children }) {
    return (
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div>
                {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.17em] text-accent">{eyebrow}</p> : null}
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">{title}</h2>
            </div>
            {children ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{children}</div> : null}
        </header>
    )
}
