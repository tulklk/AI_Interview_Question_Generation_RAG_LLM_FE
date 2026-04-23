"use client";

import { useLanguage } from "@/context/language-context";
import { features } from "@/data/guest";

export function FeaturesSection() {
  const { t } = useLanguage();
  const f = t.features;

  return (
    <section id="features" className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14 animate-fade-up">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {f.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900">{f.headline}</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto text-base leading-relaxed">
            {f.subtext}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#6c47ff]/20 p-6 transition-all duration-200 animate-fade-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-[#6c47ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#6c47ff]/15 transition-colors">
                <feature.icon size={20} className="text-[#6c47ff]" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">{f.items[i].title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.items[i].description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
