
/**
 * Wraps text to fit within a specified width, handling long words and preserving line breaks
 */
function wrapText(text: string, maxWidth: number): string[] {
  // Ensure minimum width
  const width = Math.max(maxWidth, 10);

  // Split by existing line breaks first
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push(''); // Preserve empty lines
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      // Handle very long words that exceed maxWidth
      if (word.length > width) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        // Break long words into chunks
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
      } else if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Draws a chat bubble with different tail positions and multi-line support
 * @param message - The message text to display
 * @param owner - 'user' or 'assistant' to determine bubble alignment and tail position
 * @param timestamp - Optional timestamp to display
 */
export function drawChatBubble(message: string, owner: 'user' | 'assistant', timestamp?: string): string {
  // Get terminal width with fallback and ensure minimum width
  const terminalWidth = process.stdout.columns || 80;
  const minWidth = 40;
  const maxBubbleWidth = Math.max(minWidth, Math.floor(terminalWidth * 0.8)); // Use 80% of terminal width

  const padding = 2; // Padding on each side
  const borderWidth = 2; // Left and right borders
  const maxContentWidth = maxBubbleWidth - (padding * 2) - borderWidth;

  // Wrap text to fit within the content area
  const lines = wrapText(message, maxContentWidth);

  // Calculate the actual bubble width (longest line + padding + borders)
  const contentWidth = Math.max(...lines.map(line => line.length));
  const bubbleWidth = contentWidth + (padding * 2);

  let result = '';

  if (owner === 'user') {
    // Right-aligned bubble for user
    const totalBubbleWidth = bubbleWidth + borderWidth;
    const indent = Math.max(0, terminalWidth - totalBubbleWidth - 2); // Leave some margin
    const spaces = ' '.repeat(indent);

    // Top border
    result += spaces + '╭' + '─'.repeat(bubbleWidth) + '╮\n';

    // Content lines
    for (const line of lines) {
      const paddedLine = ' '.repeat(padding) + line + ' '.repeat(contentWidth - line.length + padding);
      result += spaces + '│' + paddedLine + '│\n';
    }

    // Bottom border with tail on the right
    result += spaces + '╰' + '─'.repeat(bubbleWidth - 2) + '┬╯\n';

  } else {
    // Left-aligned bubble for assistant

    // Top border
    result += '╭' + '─'.repeat(bubbleWidth) + '╮\n';

    // Content lines
    for (const line of lines) {
      const paddedLine = ' '.repeat(padding) + line + ' '.repeat(contentWidth - line.length + padding);
      result += '│' + paddedLine + '│\n';
    }

    // Bottom border with tail on the left
    result += '╰┬' + '─'.repeat(bubbleWidth - 2) + '╯\n';
  }

  // Add timestamp if provided
  if (timestamp) {
    const timeStr = `[${timestamp}]`;
    if (owner === 'user') {
      const indent = Math.max(0, terminalWidth - timeStr.length - 2);
      result += ' '.repeat(indent) + timeStr + '\n';
    } else {
      result += timeStr + '\n';
    }
  }

  return result;
}

export function chatUser(message: string) {
  console.log(
    drawChatBubble(message, 'user')
  )
}

export function chatAssistant(message: string) {
  console.log(
    drawChatBubble(message, 'assistant')
  )
}