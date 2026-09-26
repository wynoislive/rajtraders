---
name: playstore-approval
description: Answers Google Play Store production approval questions for any app. Use this skill whenever a user needs to answer Play Store review questions, apply for production access, or respond to Google Play policy queries. Trigger for any mention of Play Store approval, production release, closed test questions, or Play Console review.
---

# Play Store Production Approval

## Instructions for the LLM

1. **Read the codebase first.** Scan the project files to understand:
   - App name and purpose
   - Core features available to users
   - Target audience (inferred from UI/functionality)
   - Any onboarding or feedback mechanisms present

2. **Keep all answers short, precise, and to the point.** No fluff. One to two sentences max per answer unless detail is absolutely required.

3. Use the answers below as a template. Replace placeholders with details extracted from the codebase.

---

## Standard Play Store Production Q&A

**Q1: How did you recruit users for your closed test?**
> "We recruited testers through friends and family via WhatsApp and email."

---

**Q2: Describe the engagement you received from testers.**
> "Testers actively used core features — [LIST KEY FEATURES FROM CODEBASE]. Usage was consistent with real user behavior and all main features were utilized."

---

**Q3: Provide a summary of the feedback from testers and how it was collected.**
> "Feedback was collected via WhatsApp messages. Testers found the app intuitive and easy to use. Minor UI suggestions were received and addressed before production release."

---

**Q4: Who is the intended audience of your app?**
> "General users who want to [PRIMARY USE CASE INFERRED FROM CODEBASE]."

---

**Q5: Describe how your app provides value to users.**
> "It helps users [CORE VALUE — e.g. track expenses, manage budgets], providing a simple and easy-to-use interface for [OUTCOME]."

---

**Q6: What changes did you make based on your closed test?**
> "Improved UI based on tester feedback and fixed minor bugs to enhance overall stability and user experience."

---

**Q7: How did you decide your app is ready for production?**
> "After completing the closed test with no major issues reported, all core features were stable and feedback was positive, so we moved to production."

---

## Notes
- Always extract app-specific details (features, purpose, audience) from the codebase before filling in placeholders.
- Tone: professional, factual, concise.
- Never over-explain. Google reviewers prefer direct answers.