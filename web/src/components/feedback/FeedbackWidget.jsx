"use client";

import { useCallback, useState } from "react";

import { FeedbackButton } from "./FeedbackButton";
import { FeedbackSheet } from "./FeedbackSheet";
import { FeedbackSuccess } from "./FeedbackSuccess";

/**
 * Self-contained feedback experience: the floating launcher, the flow sheet,
 * and the celebratory modal. Mounted once, globally (see `layout.jsx`), so it's
 * available on every screen and owns its own state — nothing to wire up per page.
 */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [successReaction, setSuccessReaction] = useState(null);

  const handleSubmitted = useCallback((reaction) => {
    // Let the sheet finish sliding out before the celebration springs in, so
    // the two backdrops never stack for a frame.
    setOpen(false);
    setTimeout(() => setSuccessReaction(reaction), 240);
  }, []);

  return (
    <>
      <FeedbackButton onClick={() => setOpen(true)} />
      <FeedbackSheet
        open={open}
        onClose={() => setOpen(false)}
        onSubmitted={handleSubmitted}
      />
      <FeedbackSuccess
        reaction={successReaction}
        onClose={() => setSuccessReaction(null)}
      />
    </>
  );
}
