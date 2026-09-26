---
name: aso-release-notes
description: Generates polished App Store and Google Play release notes with ASO-friendly wording from app change summaries. Outputs a release name (max 56 chars) and marketing bullet points in Markdown. Use when writing app store release notes, update descriptions, what's new text, or ASO-optimized changelog copy.
---

# Generate App Store Release Notes

## Purpose

Use this skill when the user provides a summary of changes made in their app and wants polished release notes for an app store release.

The output must include:

• A release name
• Marketing-friendly release notes
• ASO-style wording for better app store visibility
• Markdown format
• Bullet points using the actual bullet symbol `•`, not hyphens
• No emojis
• No em dash character
• A catchy, professional tone
• A maximum release name length of 56 characters

## Input

The user will describe the changes made in the app, such as:

• New features
• Bug fixes
• UI improvements
• Performance updates
• Security improvements
• Subscription or pricing changes
• User experience enhancements
• App stability updates

## Output Format

Always return the response in Markdown using this exact structure:

```md
## Release Name

<release name with maximum 56 characters>

## Release Notes

• <catchy, marketing-friendly bullet point>
• <catchy, marketing-friendly bullet point>
• <catchy, marketing-friendly bullet point>
```

## Release Name Rules

• The release name must be catchy and app-store friendly
• The release name must not exceed 56 characters
• The release name should summarize the most important update
• The release name should sound polished, useful, and benefit-driven
• Do not include emojis
• Do not use an em dash
• Prefer short phrases with strong ASO keywords when relevant

Good examples:

• Faster Trading, Smarter Insights
• Smoother Experience, Better Performance
• New Dashboard, Faster App Performance
• Smarter Alerts and Cleaner Navigation
• Improved Security and Speed Boost

## Release Notes Rules

• Use `•` for every bullet point
• Do not use `-` as a bullet symbol
• Do not use emojis
• Do not use the em dash character
• Keep the tone catchy, clear, and marketing-friendly
• Make the copy optimized for app store visibility
• Mention user benefits, not only technical changes
• Use keywords naturally, such as performance, stability, faster, smoother, secure, improved, smarter, seamless, experience, dashboard, alerts, navigation, bug fixes, reliability
• Avoid overly technical language unless the user specifically asks for technical notes
• Avoid generic lines like “Bug fixes and improvements” unless expanded into a better user-focused version
• Keep each bullet concise and polished
• Do not exaggerate beyond what the user provided
• Do not invent features not mentioned by the user

## Writing Style

Transform plain change descriptions into benefit-focused release notes.

Instead of:

• Fixed login bug

Write:

• Enjoy a smoother sign-in experience with improved login reliability

Instead of:

• Added new chart screen

Write:

• Explore market trends more clearly with a new, easy-to-read chart experience

Instead of:

• Improved app speed

Write:

• Experience faster loading times and smoother app performance across key screens

## ASO Optimization Guidelines

Where relevant, naturally include app store friendly keywords such as:

• Faster performance
• Improved stability
• Smooth user experience
• Secure login
• Smarter notifications
• Better dashboard
• Enhanced navigation
• Bug fixes
• Reliability improvements
• Seamless experience
• Real-time updates
• Cleaner design
• Optimized app performance

Do not keyword-stuff. The release notes should still sound natural and human.

## Response Rules

When the user gives app changes, respond only with the final Markdown output.

Do not explain the process.

Do not add extra commentary before or after the release notes.

Do not ask follow-up questions unless the provided changes are completely unclear.

If the user gives very little detail, create a safe, general version based only on what they shared.

## Example

User input:

I improved the dashboard loading speed, fixed notification issues, added a new price alert screen, and improved login stability.

Expected output:

```md
## Release Name

Faster Dashboard and Smarter Price Alerts

## Release Notes

• Track your updates faster with improved dashboard loading and smoother performance
• Stay informed with more reliable notifications for important app activity
• Set and manage alerts more easily with a new, cleaner price alert experience
• Sign in with more confidence thanks to improved login stability and reliability
```

---
