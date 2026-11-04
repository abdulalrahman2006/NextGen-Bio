import Link from "next/link";
import FeedbackForm from "@/components/FeedbackForm";

export default function FeedbackPage({ searchParams }: { searchParams: { sent?: string } }) {
  return (
    <section className="pt-28 pr-6 max-w-2xl pb-24">
      <h1 className="mb-6 text-4xl font-black tracking-tight md:text-6xl">Feedback</h1>
      <p className="text-slate7 text-lg mb-10">Suggestions, complaints or a problem you ran into. Only the site admins can read what you send.</p>
      {searchParams.sent ? (
        <div className="border-2 border-slate9 p-6">
          <p className="font-black text-2xl">Thank you. Your message went to the admins.</p>
          <Link href="/feedback" className="inline-block mt-4 underline font-bold">Send another</Link>
        </div>
      ) : <FeedbackForm />}
    </section>
  );
}
