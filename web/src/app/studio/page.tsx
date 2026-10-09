import Link from "next/link";
import { getDemoSession } from "@/lib/demo-auth";

export default async function StudioHome() {
  const session = await getDemoSession();
  return <main className="studio-placeholder"><Link className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/><i/></span><span>fastmix<span className="brand-dot">.</span></span></Link><span className="kicker">LOCAL PREVIEW WORKSPACE</span><h1>Welcome in, {session?.name}.</h1><p>Your studio shell is ready. The mixer and project workspace are the next build phase.</p><Link className="button button-lime" href="/">Back to the public site <span>↗</span></Link></main>;
}
