import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  Flame,
  Lightbulb,
  Megaphone,
  PlayCircle,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Wallet,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function Learning() {
  const navigate = useNavigate();

  const tabs = ["All", "Startup", "Career", "AI", "Marketing", "Finance"];

  const skills = [
    "MERN Stack",
    "AI Tools",
    "Sales",
    "Content",
    "UI Design",
    "Digital Marketing",
  ];

  const openLearningView = (learning) => {
    navigate(`/learning/${learning._id}`, {
      state: { learning },
    });
  };

  const todayPick = {
    _id: "platform-today-pick",
    title: "Learn what actually helps you earn.",
    content:
      "Short lessons for jobs, startups, freelancing and creators. Focus on practical skills, proof of work, and real execution.",
    author: {
      _id: "imcircle-platform",
      name: "IMCircle",
      username: "imcircle",
    },
    tags: ["startup", "career", "growth"],
    likes: [],
    commentsCount: 0,
    type: "platform_learning",
  };

  const lessons = [
    {
      _id: "platform-startup-basics",
      icon: <Rocket size={22} />,
      title: "Startup Basics for IMCircle Founders",
      content:
        "Validate your idea before building. Talk to users, create a small MVP, test demand, then improve based on real feedback.",
      subtitle: "Idea validation, MVP, first users and monetization.",
      tag: "Startup",
      time: "12 min",
      author: {
        _id: "imcircle-platform",
        name: "IMCircle",
        username: "imcircle",
      },
      tags: ["startup", "mvp", "founder"],
      likes: [],
    },
    {
      _id: "platform-first-internship",
      icon: <BriefcaseBusiness size={22} />,
      title: "How to Get Your First Internship",
      content:
        "Build proof before applying. Create small projects, write what you learned, and message recruiters with clarity.",
      subtitle: "Build proof, apply smart and message recruiters better.",
      tag: "Career",
      time: "9 min",
      author: {
        _id: "imcircle-platform",
        name: "IMCircle",
        username: "imcircle",
      },
      tags: ["career", "internship", "proof"],
      likes: [],
    },
    {
      _id: "platform-ai-tools",
      icon: <Wand2 size={22} />,
      title: "AI Tools Every Student Should Know",
      content:
        "Use AI for learning faster, writing better, building projects, creating designs, and understanding difficult topics.",
      subtitle: "Use AI for learning, coding, design and productivity.",
      tag: "AI",
      time: "7 min",
      author: {
        _id: "imcircle-platform",
        name: "IMCircle",
        username: "imcircle",
      },
      tags: ["ai", "student", "tools"],
      likes: [],
    },
    {
      _id: "platform-personal-brand",
      icon: <Megaphone size={22} />,
      title: "Content That Builds Personal Brand",
      content:
        "Share your journey, lessons, mistakes, and progress. Consistency builds trust faster than polished fake success.",
      subtitle: "Post ideas, hooks and consistency without copying others.",
      tag: "Marketing",
      time: "10 min",
      author: {
        _id: "imcircle-platform",
        name: "IMCircle",
        username: "imcircle",
      },
      tags: ["content", "brand", "growth"],
      likes: [],
    },
  ];

  const tracks = [
    {
      title: "Founder Track",
      subtitle: "Build, launch and get first users",
      progress: 42,
      icon: <Rocket size={21} />,
    },
    {
      title: "Job Ready Track",
      subtitle: "Portfolio, resume and interview prep",
      progress: 68,
      icon: <BriefcaseBusiness size={21} />,
    },
    {
      title: "Creator Track",
      subtitle: "Content, audience and monetization",
      progress: 25,
      icon: <PlayCircle size={21} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-bg)] pb-28">
        <div className="sticky top-0 z-30 border-b border-[var(--imc-border)] bg-[var(--imc-surface-2)]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <ArrowLeft size={21} />
            </button>

            <div className="text-center">
              <h1 className="text-[19px] font-black text-[var(--imc-text)]">
                Learning
              </h1>
              <p className="text-[11px] font-bold text-[var(--imc-text-faint)]">
                Skill up for real opportunities
              </p>
            </div>

            <button
              onClick={() => openLearningView(todayPick)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--imc-surface)] shadow-sm"
            >
              <Sparkles size={21} className="text-[var(--imc-indigo-text)]" />
            </button>
          </div>

          <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface)] px-4 shadow-sm">
            <Search size={18} className="text-[var(--imc-text-muted)]" />
            <input
              placeholder="Search skills, lessons, careers..."
              className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-black ${
                  index === 0
                    ? "bg-[#4338CA] text-white"
                    : "bg-[var(--imc-surface)] text-[var(--imc-indigo-text)] shadow-sm"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-5">
          <button
            onClick={() => openLearningView(todayPick)}
            className="w-full rounded-[32px] bg-gradient-to-br from-[#12141C] to-[#2E2A8F] p-5 text-left text-white shadow-xl active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] font-bold text-white/60">
                  Today&apos;s Pick
                </p>
                <h2 className="mt-2 text-[24px] font-black leading-7">
                  Learn what actually helps you earn.
                </h2>
                <p className="mt-2 text-[12px] font-semibold leading-5 text-white/70">
                  Short lessons for jobs, startups, freelancing and creators.
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/12">
                <BookOpen size={27} />
              </div>
            </div>

            <div className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--imc-surface)] text-[14px] font-black text-[var(--imc-text)]">
              Start Learning
            </div>
          </button>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-black text-[var(--imc-text)]">
                Trending Skills
              </h2>
              <Flame size={20} className="text-[#EC9A1E]" />
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  className="rounded-full border border-[var(--imc-border)] bg-[var(--imc-surface)] px-4 py-2 text-[12px] font-black text-[var(--imc-indigo-text)] shadow-sm"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-black text-[var(--imc-text)]">
                Growth Tracks
              </h2>
              <button className="text-[12px] font-black text-[var(--imc-indigo-text)]">
                View all
              </button>
            </div>

            <div className="space-y-3">
              {tracks.map((track) => (
                <div
                  key={track.title}
                  className="rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                      {track.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[14px] font-black text-[var(--imc-text)]">
                            {track.title}
                          </h3>
                          <p className="mt-0.5 text-[11px] font-semibold text-[var(--imc-text-muted)]">
                            {track.subtitle}
                          </p>
                        </div>

                        <ChevronRight
                          size={18}
                          className="shrink-0 text-[var(--imc-text-faint)]"
                        />
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--imc-surface-2)]">
                        <div
                          className="h-full rounded-full bg-[#4338CA]"
                          style={{ width: `${track.progress}%` }}
                        />
                      </div>

                      <p className="mt-2 text-[10px] font-black text-[var(--imc-text-faint)]">
                        {track.progress}% completed
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-black text-[var(--imc-text)]">
                Recommended Lessons
              </h2>
              <button className="text-[12px] font-black text-[var(--imc-indigo-text)]">
                See all
              </button>
            </div>

            <div className="space-y-3">
              {lessons.map((lesson) => (
                <button
                  key={lesson.title}
                  onClick={() => openLearningView(lesson)}
                  className="w-full rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 text-left shadow-sm active:scale-[0.99]"
                >
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                      {lesson.icon}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-[14px] font-black leading-5 text-[var(--imc-text)]">
                          {lesson.title}
                        </h3>

                        <span className="shrink-0 rounded-full bg-[var(--imc-surface-2)] px-2 py-1 text-[9px] font-black text-[var(--imc-indigo-text)]">
                          {lesson.tag}
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] font-semibold leading-4 text-[var(--imc-text-muted)]">
                        {lesson.subtitle}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--imc-text-faint)]">
                          <PlayCircle size={14} />
                          {lesson.time}
                        </span>

                        <span className="rounded-full bg-[#12141C] px-4 py-2 text-[11px] font-black text-white">
                          Learn
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <CategoryCard
              icon={<Lightbulb size={21} />}
              title="Ideas"
              subtitle="Validate better"
            />
            <CategoryCard
              icon={<TrendingUp size={21} />}
              title="Growth"
              subtitle="Get users"
            />
            <CategoryCard
              icon={<Wallet size={21} />}
              title="Money"
              subtitle="Earn online"
            />
            <CategoryCard
              icon={<BookOpen size={21} />}
              title="Career"
              subtitle="Build proof"
            />
          </div>
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

function CategoryCard({ icon, title, subtitle }) {
  return (
    <button className="rounded-[28px] border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 text-left shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
        {icon}
      </div>

      <h3 className="mt-3 text-[15px] font-black text-[var(--imc-text)]">{title}</h3>

      <p className="mt-0.5 text-[11px] font-bold text-[var(--imc-text-muted)]">
        {subtitle}
      </p>
    </button>
  );
}

export default Learning;