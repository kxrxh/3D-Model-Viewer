import { useState, useCallback, useEffect } from "react";

// Performance profiles for different rendering quality
export const PERFORMANCE_PROFILES = {
	auto: {
		name: "Автоматический",
		gl: {
			powerPreference: "high-performance",
			antialias: true,
			precision: "highp",
		},
		shadows: true,
		physicallyCorrectLights: true,
		environment: "city",
	},
	high: {
		name: "Высокое",
		gl: {
			powerPreference: "high-performance",
			antialias: true,
			precision: "highp",
		},
		shadows: true,
		physicallyCorrectLights: true,
		environment: "city",
	},
	medium: {
		name: "Среднее",
		gl: {
			powerPreference: "high-performance",
			antialias: true,
			precision: "mediump",
		},
		shadows: true,
		physicallyCorrectLights: true,
		environment: "city",
	},
	low: {
		name: "Низкое",
		gl: {
			powerPreference: "low-power",
			antialias: false,
			precision: "mediump",
		},
		shadows: false,
		physicallyCorrectLights: false,
		environment: "sunset",
	},
	ultraLow: {
		name: "Очень низкое",
		gl: {
			powerPreference: "low-power",
			antialias: false,
			precision: "lowp",
		},
		shadows: false,
		physicallyCorrectLights: false,
		environment: "sunset",
	},
};

export default function usePerformanceProfiles() {
	const [activeProfile, setActiveProfile] = useState<string>("medium");
	const [dpr, setDpr] = useState<number>(
		activeProfile === "ultraLow"
			? Math.min(1, window.devicePixelRatio)
			: activeProfile === "low"
				? Math.min(1.25, window.devicePixelRatio)
				: Math.min(1.75, window.devicePixelRatio),
	);
	const [adaptiveDprEnabled, setAdaptiveDprEnabled] = useState<boolean>(
		activeProfile === "auto",
	);

	// Auto-adjust DPR when profile changes
	useEffect(() => {
		if (activeProfile === "ultraLow") {
			setDpr(Math.min(1, window.devicePixelRatio));
		} else if (activeProfile === "low") {
			setDpr(Math.min(1.25, window.devicePixelRatio));
		} else if (activeProfile === "medium") {
			setDpr(Math.min(1.5, window.devicePixelRatio));
		} else {
			setDpr(Math.min(1.75, window.devicePixelRatio));
		}

		setAdaptiveDprEnabled(activeProfile === "auto");
	}, [activeProfile]);

	// Simple performance monitoring
	const handlePerformanceChange = useCallback(
		(isIncline: boolean) => {
			if (activeProfile !== "auto") return;

			if (isIncline) {
				// Performance improved, we can increase quality
				setDpr((prev) => Math.min(prev + 0.25, window.devicePixelRatio));
			} else {
				// Performance declined, decrease quality
				setDpr((prev) => Math.max(prev - 0.25, 0.75));
			}
		},
		[activeProfile],
	);

	return {
		profiles: PERFORMANCE_PROFILES,
		activeProfile,
		setActiveProfile,
		dpr,
		adaptiveDprEnabled,
		handlePerformanceChange,
	};
}
