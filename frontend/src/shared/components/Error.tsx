interface ErrorProps {
  message: string
  onDismiss?: () => void
}

export const Error = ({ message, onDismiss }: ErrorProps) => {
  return (
    <div className="error">
      <p>{message}</p>
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  )
}

