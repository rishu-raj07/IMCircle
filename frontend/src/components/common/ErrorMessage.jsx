function ErrorMessage({ message = "Something went wrong." }) {
  return (
    <div className="rounded-2xl bg-[#FEF3F2] px-4 py-3 text-[13px] font-bold text-[#D92D20]">
      {message}
    </div>
  );
}

export default ErrorMessage;
