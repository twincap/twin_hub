"use client";

import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { getUtilityStatusLabel } from "@/utilities/labels";
import type { UtilityDefinition } from "@/utilities/types";

type UtilityIndexProps = {
  utilities: readonly UtilityDefinition[];
  headingLevel?: 1 | 2;
};

const allCategory = "전체";

export function UtilityIndex({ utilities, headingLevel = 2 }: UtilityIndexProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(allCategory);

  const categories = useMemo(
    () => [allCategory, ...Array.from(new Set(utilities.map((utility) => utility.category)))],
    [utilities]
  );

  const filteredUtilities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return utilities.filter((utility) => {
      const matchesCategory = category === allCategory || utility.category === category;
      const searchable = [utility.name, utility.summary, utility.description, utility.category, utility.tags.join(" ")]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, query, utilities]);
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section className="utility-index" aria-labelledby="utility-index-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">유틸</p>
          <Heading id="utility-index-title">목록</Heading>
        </div>
        <span className="runtime-pill">{filteredUtilities.length}개</span>
      </div>

      <div className="utility-controls">
        <label className="searchbox" aria-label="유틸 검색">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름, 태그, 형식 검색" type="search" />
        </label>
        <div className="category-tabs" role="group" aria-label="카테고리 필터">
          {categories.map((item) => (
            <button
              className={item === category ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
              aria-pressed={item === category}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {filteredUtilities.length ? (
        <div className="utility-grid">
          {filteredUtilities.map((utility) => (
            <article className="utility-card" key={utility.slug} style={{ "--accent": utility.accent } as CSSProperties}>
              <header>
                <h3>{utility.name}</h3>
                <span className="status-pill">{getUtilityStatusLabel(utility.status)}</span>
              </header>
              <div>
                <p>{utility.summary}</p>
              </div>
              <div className="tag-list">
                {utility.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <footer>
                <span className="runtime-pill">{utility.category}</span>
                <Link className="button primary" href={utility.path}>
                  열기
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">{utilities.length ? "검색 결과가 없습니다." : "등록된 유틸이 없습니다."}</div>
      )}
    </section>
  );
}
