import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

type PageTone = 'parchment' | 'combat';
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface PageShellProps {
  title: string;
  subtitle?: string;
  kicker?: string;
  tone?: PageTone;
  scrollable?: boolean;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
}

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

interface TabButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const PageShell: React.FC<PageShellProps> = ({
  title,
  subtitle,
  kicker = '卷轴章节',
  tone = 'parchment',
  scrollable = false,
  actions,
  footer,
  children,
  className,
  contentClassName,
  style,
}) => (
  <div
    className={cn('page-shell', tone === 'combat' ? 'page-shell--combat' : 'page-shell--parchment', className)}
    style={style}
  >
    <div className="page-shell__vignette" />
    <div className="page-shell__grain" />
    <div
      className={cn(
        'relative z-10 mx-auto flex h-full max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6 md:py-5',
        scrollable && 'overflow-y-auto overflow-x-hidden ornate-scroll',
      )}
    >
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="ornate-panel px-5 py-5 md:px-7"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="chapter-kicker">{kicker}</div>
            <h1 className="chapter-title mt-2">{title}</h1>
            {subtitle ? <p className="chapter-subtitle mt-2">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">{actions}</div> : null}
        </div>
      </motion.header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.04 }}
        className={cn(scrollable ? 'flex-none' : 'min-h-0 flex-1', contentClassName)}
      >
        {children}
      </motion.main>

      {footer ? (
        <motion.footer
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          className="ornate-panel px-4 py-3 md:px-5"
        >
          {footer}
        </motion.footer>
      ) : null}
    </div>
  </div>
);

export const Panel: React.FC<PanelProps> = ({ children, className, inset = false }) => (
  <div className={cn(inset ? 'inset-panel' : 'ornate-panel', className)}>{children}</div>
);

export const SectionTitle: React.FC<{ title: string; hint?: string; className?: string }> = ({
  title,
  hint,
  className,
}) => (
  <div className={cn('mb-3', className)}>
    <div className="flex items-center gap-3">
      <h3 className="section-title">{title}</h3>
      <div className="section-divider" />
    </div>
    {hint ? <div className="section-hint mt-1">{hint}</div> : null}
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'amber' | 'slate' | 'emerald' | 'crimson' | 'blue';
  className?: string;
}> = ({ children, variant = 'amber', className }) => (
  <span className={cn('ornate-badge', `ornate-badge--${variant}`, className)}>{children}</span>
);

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = 'secondary',
  className,
  children,
  ...props
}) => (
  <button className={cn('ornate-button', `ornate-button--${variant}`, className)} {...props}>
    {children}
  </button>
);

export const TabButton: React.FC<TabButtonProps> = ({
  active = false,
  className,
  children,
  ...props
}) => (
  <button className={cn('ornate-tab', active && 'ornate-tab--active', className)} {...props}>
    {children}
  </button>
);
