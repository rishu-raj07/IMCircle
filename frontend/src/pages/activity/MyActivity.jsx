import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  Repeat2,
  Rocket,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../../components/navigation/BottomNav";

function MyActivity() {
  const navigate = useNavigate();

  const tabs = ["All", "Posts", "Comments", "Likes", "Reposts", "Saved", "Journey"];

  const activities = [
    {
      type: "post",
      icon: <Rocket size={18} />,
      title: "You posted an update",
      text: "Day 32 of building IMCircle. Today I improved the messaging system.",
      time: "12m",
      tag: "Journey",
    },
    {
      type: "comment",
      icon: <MessageCircle size={18} />,
      title: "You commented on Priya's post",
      text: "This is a strong design direction for IMCircle creators.",
      time: "1h",
      tag: "Comment",
    },
    {
      type: "like",
      icon: <Heart size={18} />,
      title: "You liked a post",
      text: "Rahul shared a frontend developer opportunity.",
      time: "3h",
      tag: "Like",
    },
    {
      type: "repost",
      icon: <Repeat2 size={18} />,
      title: "You reposted an opportunity",
      text: "Graphic Designer needed for a startup project.",
      time: "Yesterday",
      tag: "Repost",
    },
    {
      type: "saved",
      icon: <Bookmark size={18} />,
      title: "You saved a job",
      text: "Frontend Developer Intern · Remote",
      time: "2d",
      tag: "Saved",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--imc-bg)]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[var(--imc-surface)] pb-28">
        <div className="border-b border-[var(--imc-border)] bg-[var(--imc-surface)] px-5 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)]"
            >
              <ArrowLeft size={21} />
            </button>

            <h1 className="text-[20px] font-black text-[var(--imc-text)]">
              My Activity
            </h1>

            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--imc-surface-2)]">
              <MoreHorizontal size={21} />
            </button>
          </div>

          <div className="mt-4 flex h-12 items-center gap-3 rounded-2xl bg-[var(--imc-surface-2)] px-4">
            <Search size={19} className="text-[var(--imc-text-muted)]" />
            <input
              placeholder="Search your activity..."
              className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-[var(--imc-text-faint)]"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-black ${
                  index === 0
                    ? "bg-[#4338CA] text-white"
                    : "bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          {activities.map((item, index) => (
            <div
              key={index}
              className="rounded-3xl border border-[var(--imc-border)] bg-[var(--imc-surface)] p-4 shadow-sm"
            >
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--imc-surface-2)] text-[var(--imc-indigo-text)]">
                  {item.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[14px] font-black text-[var(--imc-text)]">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[13px] font-medium leading-5 text-[var(--imc-text-muted)]">
                        {item.text}
                      </p>
                    </div>

                    <span className="shrink-0 text-[11px] font-bold text-[var(--imc-text-faint)]">
                      {item.time}
                    </span>
                  </div>

                  <span className="mt-3 inline-flex rounded-full bg-[var(--imc-surface-2)] px-3 py-1 text-[11px] font-black text-[var(--imc-indigo-text)]">
                    {item.tag}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <BottomNav />
      </div>
    </div>
  );
}

export default MyActivity;