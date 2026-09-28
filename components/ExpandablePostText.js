import { useId, useState } from "react";
import styles from "./ExpandablePostText.module.css";

// Match the existing feed's preview length without changing the stored post.
export const POST_PREVIEW_LENGTH = 260;

export default function ExpandablePostText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const isLong = text.length > POST_PREVIEW_LENGTH;

  return <>
    <span id={contentId}>{isLong && !expanded ? `${text.slice(0, POST_PREVIEW_LENGTH)}…` : text}</span>
    {isLong && <>{" "}<button type="button" className={styles.toggle}
      aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>
      {expanded ? "收合" : "展開全文"}
    </button></>}
  </>;
}
