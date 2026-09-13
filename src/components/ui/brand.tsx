import Link from "next/link";
import { CodeMark } from "./icons";

export function Brand() {
  return <Link className="brand" href="/#inicio" aria-label="Carlos Duarte — início"><span className="brand-mark"><CodeMark /></span><span>Carlos<span className="brand-dot">.</span></span></Link>;
}
