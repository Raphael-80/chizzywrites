import { useState } from "react";
import { FiArrowRight, FiCheck } from "react-icons/fi";

export default function Newsletter() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState("idle");

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            setStatus("error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(trimmedEmail)) {
            setStatus("error");
            return;
        }

        // Temporary success state.
        // Connect this to your newsletter provider/backend later.
        setStatus("success");
        setEmail("");
    };

    return (
        <section
            className="
        py-32 px-6
      "
        >
            <div className="max-w-4xl mx-auto text-center">
                <p
                    className="
            text-sm
            uppercase
            tracking-[0.25em]
            text-[#b7791f]
            mb-5
          "
                >
                    Stay curious
                </p>

                <h2
                    className="
            heading-font
            text-5xl
            md:text-6xl
            mb-6
          "
                >
                    Good ideas,
                    <br />
                    delivered occasionally.
                </h2>

                <p
                    className="
            text-black/60
            dark:text-white/60
            max-w-xl
            mx-auto
            leading-7
            mb-8
          "
                >
                    Get new articles, ideas and perspectives from
                    ChizzyWrites straight to your inbox.
                </p>

                {status === "success" ? (
                    <div
                        className="
              flex
              items-center
              justify-center
              gap-2
              text-sm
              text-white
              py-3
            "
                    >
                        <span
                            className="
                w-8
                h-8
                rounded-full
                bg-[#b7791f]
                flex
                items-center
                justify-center
              "
                        >
                            <FiCheck size={16} />
                        </span>

                        <span>
                            You're subscribed. Thanks for joining us.
                        </span>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="
            flex
            flex-col
            sm:flex-row
            max-w-lg
            mx-auto
            gap-3
            "
                    >
                        <div className="flex-1">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setStatus("idle");
                                }}
                                placeholder="Enter your email address"
                                className="
                  w-full
                  h-12
                  px-5
                  rounded-full
                  bg-white/10
                  border
                  border-white/10
                  text-white
                  placeholder:text-white/40
                  outline-none
                  focus:border-[#b7791f]
                  transition
                "
                            />

                            {status === "error" && (
                                <p className="text-left text-xs text-red-400 mt-2 px-4">
                                    Please enter a valid email address.
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="
                h-12
                px-6
                rounded-full
                bg-[#171717]
                dark:bg-[#f5f2ea]
                text-white
                dark:text-[#111111]
                font-medium
                hover:opacity-80
                font-medium
                text-sm
                flex
                items-center
                justify-center
                gap-2
                transition
                shrink-0
              "
                        >
                            Subscribe
                            <FiArrowRight size={16} />
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}