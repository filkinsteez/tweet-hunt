import dynamic from "next/dynamic";
import styles from "./page.module.css";

const TvExperimentScene = dynamic(() => import("@/components/experiment/TvExperimentScene").then((mod) => mod.TvExperimentScene), {
  ssr: false,
  loading: () => (
    <main className={styles.loadingShell}>
      <div className={styles.loadingCard}>
        <p className={styles.eyebrow}>Tweet Hunt Lab</p>
        <h1>Loading photoreal TV experiment...</h1>
      </div>
    </main>
  )
});

export const metadata = {
  title: "Photoreal TV Experiment - Tweet Hunt",
  description: "A removable Three.js test route for viewing Tweet Hunt on a photoreal CRT television."
};

export default function TvExperimentPage() {
  return <TvExperimentScene />;
}
