// Mock for next/image
import React from "react";

interface NextImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: { src: string } | string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  fill?: boolean;
  quality?: number;
}

const NextImage = ({
  src,
  alt,
  width,
  height,
  priority,
  fill,
  quality,
  ...props
}: NextImageProps) => {
  // Handle Next.js Image src object format
  const srcValue = typeof src === "object" ? src.src : src;
  
  // Filter out Next.js-specific props that shouldn't be on img element
  // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
  return <img src={srcValue} alt={alt} width={width} height={height} {...props} />;
};

export default NextImage;
