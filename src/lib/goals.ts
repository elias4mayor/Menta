/**
 * Role-specific "what do you want to improve?" options — full sentences,
 * not single words, per role. Used by the onboarding goals MultiSelect for
 * every role; the underlying component is shared, only this data and the
 * question wording change per role.
 */
export const GOAL_OPTIONS: Record<string, string[]> = {
  ATHLETE: [
    "I want to get stronger and more athletic.",
    "I want to improve my speed and agility.",
    "I want to improve my endurance and conditioning.",
    "I want to improve my technique and skills.",
    "I want to improve my confidence and mental performance.",
    "I want to improve my recovery and sleep.",
    "I want to improve my nutrition and daily habits.",
    "I want to become more consistent with my training.",
    "I want to improve my game IQ and decision-making.",
    "I want to improve my academics and school performance.",
    "I want to improve my recruiting opportunities.",
    "I want to become a better leader.",
  ],
  COACH: [
    "I want to improve my team's overall performance.",
    "I want to improve how I develop my athletes.",
    "I want to create better training plans.",
    "I want to improve my team's game strategy.",
    "I want to make film analysis more effective.",
    "I want to improve communication with my athletes.",
    "I want to improve player engagement and accountability.",
    "I want to improve recruiting and athlete exposure.",
    "I want to better support my athletes academically.",
    "I want to better support athlete wellness and recovery.",
    "I want to improve injury-prevention practices.",
    "I want to become a better leader and coach.",
  ],
  TRAINER: [
    "I want to improve my clients' strength and athleticism.",
    "I want to improve speed and agility development.",
    "I want to improve conditioning programs.",
    "I want to improve mobility and movement quality.",
    "I want to improve recovery programs.",
    "I want to improve injury-prevention practices.",
    "I want to create better training programs.",
    "I want to improve client accountability.",
    "I want to track client progress more effectively.",
    "I want to improve nutrition and healthy habits.",
    "I want to improve communication with my clients.",
  ],
  PARENT: [
    "I want to help my athlete build confidence.",
    "I want to help my athlete improve academically.",
    "I want to help my athlete stay consistent with training.",
    "I want to help my athlete improve recovery and sleep.",
    "I want to help my athlete develop better nutrition habits.",
    "I want to better understand my athlete's recruiting opportunities.",
    "I want to improve communication with my athlete.",
    "I want to help my athlete set better goals.",
    "I want to support my athlete's overall development.",
    "I want to better understand my athlete's performance.",
  ],
};

export const GOAL_QUESTION: Record<string, string> = {
  ATHLETE: "What do you want to improve?",
  COACH: "What do you want to improve with your team?",
  TRAINER: "What do you want to improve with your athletes?",
  PARENT: "How can MENTA better support your athlete?",
};

export const GOALS_MAX = 5;
