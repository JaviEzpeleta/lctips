export const timeSince = (date: number) => {
  const distance = new Date().getTime() - new Date(date).getTime()

  if (distance < 60000) {
    const seconds = Math.floor(distance / 1000)
    return seconds === 0 ? "just now" : `${seconds}s ago`
  }

  // if the distance is less than 60 minutes, return the number of minutes
  if (distance < 3600000) {
    if (Math.floor(distance / 60000) > 1)
      return Math.floor(distance / 60000) + " minutes ago"
    else return "1 minute ago"
  }

  // if the distance is less than 24 hours, return the number of hours
  if (distance < 86400000) {
    if (Math.floor(distance / 3600000) > 1)
      return Math.floor(distance / 3600000) + " hours ago"
    else return "1 hour ago"
  }

  // if the distance is less than 30 days, return the number of days
  if (distance < 2592000000) {
    if (Math.floor(distance / 86400000) > 1)
      return Math.floor(distance / 86400000) + " days ago"
    else return "yesterday"
  }

  const months = Math.floor(distance / 2592000000)

  if (months > 11) {
    const years = (months / 12).toFixed(1)
    return years + " years ago"
  } else {
    return months === 1 ? "1 month ago" : months + " months ago"
  }
}

export const timeSinceShorter = (date: number) => {
  const distance = new Date().getTime() - new Date(date).getTime()

  // if the distance is less than 60 seconds, return 'Just now'
  if (distance < 60000) {
    return "just now"
  }

  // if the distance is less than 60 minutes, return the number of minutes
  if (distance < 3600000) {
    if (Math.floor(distance / 60000) > 1)
      return Math.floor(distance / 60000) + "m ago"
    else return "1m ago"
  }

  // if the distance is less than 24 hours, return the number of hours
  if (distance < 86400000) {
    if (Math.floor(distance / 3600000) > 1)
      return Math.floor(distance / 3600000) + "h ago"
    else return "1h ago"
  }

  // if the distance is less than 30 days, return the number of days
  if (distance < 2592000000) {
    if (Math.floor(distance / 86400000) > 1)
      return Math.floor(distance / 86400000) + "d ago"
    else return "yesterday"
  }

  const months = Math.floor(distance / 2592000000)

  if (months > 11) {
    const years = (months / 12).toFixed(1)
    return years + " years ago"
  } else {
    return months === 1 ? "1 month ago" : months + " months ago"
  }
}

export const formatFriendlyFromSeconds = (seconds: number) => {
  if (seconds < 60) {
    return seconds + "s"
  }
  if (seconds < 3600) {
    return Math.floor(seconds / 60) + "m"
  }
  if (seconds < 86400) {
    return (
      Math.floor(seconds / 3600) +
      "h" +
      " " +
      Math.round((seconds % 3600) / 60) +
      "m"
    )
  }
  if (seconds < 2592000) {
    return Math.floor(seconds / 86400) + "d"
  }
  if (seconds < 31536000) {
    return (
      Math.floor(seconds / 2592000) +
      "mo" +
      " " +
      Math.floor((seconds % 2592000) / 86400) +
      "d"
    )
  }
  return (
    Math.floor(seconds / 31536000) +
    "y" +
    " " +
    Math.floor((seconds % 31536000) / 2592000) +
    "mo"
  )
}

export const formatSongDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
}
