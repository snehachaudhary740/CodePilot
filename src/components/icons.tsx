// src/components/icons.tsx
import type { SVGProps } from "react";

export function CodePilotLogo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            width="1.5em"
            height="1.5em"
            {...props}
        >
            <path fill="none" d="M0 0h256v256H0z" />
            <path
                fill="hsl(var(--primary))"
                d="M66.6 90.6 24 128l42.6 37.4 8-7.2-33-28.9 7.4-6.6 33-29L66.6 90.6zM189.4 90.6l-8 7.9 33 29-7.4 6.6-33 28.9 8 7.2L232 128l-42.6-37.4z"
            />
            <path
                fill="hsl(var(--accent))"
                d="m154.5 44.9-96 160 15 8.9 96-160-15-8.9z"
            />
        </svg>
    );
}
