import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div>
        <p className="eyebrow">404</p>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <p>등록된 유틸인지 확인해 주세요.</p>
        <Link className="button primary" href="/utilities">
          유틸 목록으로 이동
        </Link>
      </div>
    </main>
  );
}
