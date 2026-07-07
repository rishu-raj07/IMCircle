import User from "../models/User.js";

export const getProfileSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "fullName headline bio skills role field location preferences"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const suggestions = [];

    if (!user.headline || user.headline.length < 20) {
      suggestions.push({
        type: "headline",
        priority: "high",
        message: "Add a stronger headline that clearly says what you do.",
        example: `${user.role} building in ${user.field} | Open to collaboration`,
      });
    }

    if (!user.bio || user.bio.length < 80) {
      suggestions.push({
        type: "bio",
        priority: "high",
        message: "Your bio is too short. Add your journey, skills, and what you are building.",
        example:
          "I am a builder focused on solving real-world problems. I am learning, building projects, and connecting with people in my field.",
      });
    }

    if (!user.skills || user.skills.length < 3) {
      suggestions.push({
        type: "skills",
        priority: "medium",
        message: "Add at least 3-5 skills so people can discover you better.",
        example: ["React", "Node.js", "MongoDB", "Communication", "Marketing"],
      });
    }

    if (!user.location?.city) {
      suggestions.push({
        type: "location",
        priority: "medium",
        message: "Add your city so nearby builders and opportunities can find you.",
      });
    }

    if (!user.preferences?.openToCollab) {
      suggestions.push({
        type: "collaboration",
        priority: "low",
        message: "Turn on collaboration if you want people to approach you for projects.",
      });
    }

    res.status(200).json({
      success: true,
      suggestions,
      score: Math.max(0, 100 - suggestions.length * 15),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const generatePostIdeas = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || topic.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Topic is required",
      });
    }

    const cleanTopic = topic.trim();

    const ideas = [
      {
        type: "story",
        title: `My honest journey with ${cleanTopic}`,
        caption: `Today I want to share what I learned while working on ${cleanTopic}. It was not perfect, but it helped me understand the process better.`,
      },
      {
        type: "learning",
        title: `3 things I learned about ${cleanTopic}`,
        caption: `Here are 3 practical things I learned about ${cleanTopic} that may help other builders too.`,
      },
      {
        type: "question",
        title: `What is your biggest challenge with ${cleanTopic}?`,
        caption: `I am currently exploring ${cleanTopic}. What is one mistake or lesson you learned in this area?`,
      },
    ];

    res.status(200).json({
      success: true,
      topic: cleanTopic,
      ideas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const summarizeLearning = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    const cleanContent = content.trim();

    const words = cleanContent.split(/\s+/);
    const shortSummary = words.slice(0, 25).join(" ");

    const keyTakeaways = [
      "This learning can help other builders understand the topic faster.",
      "Try adding a real example to make it more practical.",
      "Mention what problem it solved or what mistake it helped you avoid.",
    ];

    res.status(200).json({
      success: true,
      summary:
        shortSummary + (words.length > 25 ? "..." : ""),
      keyTakeaways,
      suggestedTitle:
        cleanContent.length > 60
          ? cleanContent.slice(0, 60) + "..."
          : cleanContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

export const getProjectAdvice = async (req, res) => {
  try {
    const { title, stage, problem, targetUsers } = req.body;

    if (!title || !problem) {
      return res.status(400).json({
        success: false,
        message: "Project title and problem are required",
      });
    }

    const advice = {
      strengths: [
        `${title} already has a clear building direction.`,
        "If you keep solving a specific user pain, the project can become stronger.",
      ],

      weaknesses: [
        "The biggest risk is building too many features before validating user demand.",
        "Another risk is weak retention if users do not get daily value.",
      ],

      suggestions: [
        "Talk to 20 real target users before adding more features.",
        "Focus on one core use case first.",
        "Track what users do daily, not just how many sign up.",
        "Launch with a small focused user group.",
      ],

      growthIdeas: [
        "Share founder/building journey on social media.",
        "Create niche circles for early users.",
        "Invite users manually from colleges, startup groups, and LinkedIn.",
      ],

      monetizationIdeas: [
        "Featured opportunities.",
        "Premium profile boost.",
        "Recruiter access.",
        "Verified circle subscriptions.",
      ],
    };

    res.status(200).json({
      success: true,
      project: {
        title,
        stage: stage || "not specified",
        problem,
        targetUsers: targetUsers || "not specified",
      },
      advice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};
export const getDailyCoach = async (req, res) => {
  try {
    const suggestions = [
      {
        type: "learning",
        priority: "high",
        message: "Share one thing you learned today.",
      },
      {
        type: "network",
        priority: "medium",
        message: "Connect with 2 builders in your field.",
      },
      {
        type: "project",
        priority: "high",
        message: "Push one update to your current project.",
      },
      {
        type: "journey",
        priority: "medium",
        message: "Document today's progress in your journey.",
      },
      {
        type: "engagement",
        priority: "low",
        message: "Comment on at least 3 posts from other builders.",
      },
    ];

    const motivationalQuotes = [
      "Consistency compounds faster than intensity.",
      "Ship small, learn fast, repeat.",
      "Progress beats perfection.",
      "Builders win by showing up daily.",
    ];

    const quote =
      motivationalQuotes[
        Math.floor(Math.random() * motivationalQuotes.length)
      ];

    res.status(200).json({
      success: true,
      coach: {
        date: new Date(),
        quote,
        suggestions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};