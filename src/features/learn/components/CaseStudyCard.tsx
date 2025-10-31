import React from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";

interface CaseStudyCardProps {
  title: string;
  amount: string;
  description: string;
  source?: string;
  link?: {
    text: string;
    url: string;
  };
  borderColor: string;
  iconColor: string;
  iconBgColor: string;
  amountColor: string;
  amountBgColor: string;
}

export function CaseStudyCard({
  title,
  amount,
  description,
  source,
  link,
  borderColor,
  iconColor,
  iconBgColor,
  amountColor,
  amountBgColor,
}: CaseStudyCardProps) {
  return (
    <div className={`glass-card p-8 rounded-2xl ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-4">
            <div className={`p-2 ${iconBgColor} rounded-full mr-4`}>
              <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
            </div>
            <h3 className="text-2xl font-bold text-white">{title}</h3>
            <span
              className={`ml-4 px-3 py-1 ${amountBgColor} ${amountColor} text-sm rounded-full`}
            >
              {amount}
            </span>
          </div>
          <p className="text-gray-300 mb-4 leading-relaxed">{description}</p>
          {source && <div className="text-gray-400 text-sm mb-2">{source}</div>}
          {link && (
            <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
              <div className="flex items-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                <a
                  href={link.url}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.text}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
