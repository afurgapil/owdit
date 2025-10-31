import React from "react";
import { LucideIcon, CheckCircle } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
  borderColor: string;
  iconColor: string;
  iconBgColor: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  features,
  borderColor,
  iconColor,
  iconBgColor,
}: FeatureCardProps) {
  return (
    <div
      className={`glass-card p-8 rounded-2xl ${borderColor} card-hover-glow text-center`}
    >
      <div
        className={`w-20 h-20 mx-auto mb-6 flex items-center justify-center ${iconBgColor} rounded-full`}
      >
        <Icon className={`h-10 w-10 ${iconColor}`} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-gray-300 mb-6 leading-relaxed">{description}</p>
      <div className="space-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center text-gray-300">
            <CheckCircle className={`h-5 w-5 mr-3 ${iconColor}`} />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
