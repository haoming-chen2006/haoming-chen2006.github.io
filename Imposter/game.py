import asyncio
import re
import random
from collections import defaultdict
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

model_client = OpenAIChatCompletionClient(model="gpt-4o")

GAME_RULES = """
You are playing the social deduction game Imposter with 6 total players, identified as Player 1 to Player 6. Player 6 is the referee so don't include them in the gameplay.
Roles include: 2 imposters, 4 civilians. One Referee manages the game and does not participate in the conversation. 

In the start of the game, each player is assigned a secret word -- all civilians have the same word and all imposters have the same word. 
The imposters know the civilians' word and their own word. The civilians only know their own word. The imposters must try to convince the civilians that they are civilians. The civilians must try to figure out who the imposters are and eliminate them.
The imposters win if They outnumber the civilians in remaining players or all civilians are eliminated. The civilians win if all imposters are eliminated.

The game alternates between Discussion and Vote phases.
During the **Day Phase**, all players:
1. Internally think about the current situation, strategies, and decide what to say. **You cannot directly say your word or say factually incorrect information about your word**
2. Output a public 'speech' visible to other players that describe their word.
After all players have spoken, each one:
1. Thinks about who to vote based on strategy and the speeches.
2. Publicly casts a vote with the exact prompt: "I vote Player X".
The player with the most votes is eliminated.

You must stay in character and NEVER reveal your secret role or your word.
"""

players = [f"player_{i}" for i in range(1, 6)]
referee = AssistantAgent("Referee", model_client, system_message="You are the referee of the imposter game, here are the rules" + GAME_RULES)
referee_memory = {"roles": {}, "rounds": []}
round_counter = {"day": 0}
agent_memories = defaultdict(str)

async def generate_words():
    response = await referee.run(task="Generate two similar words: one for imposter and one for civilian, the words should be in format civilian word: <word>, imposter word: <word>.The two words should be similar but not synonyms examples include: Coco-cola, pepsi; Motorcycle, bike; Teacher, student; Sun, moon. -- words like ocean and sea will not be applicable since they basically refer to the same object ")
    response_text = response.messages[-1].content.strip()
    m = re.search(r"civilian word: (.+), imposter word: (.+)", response_text.lower())
    civilian_word = m.group(1)
    imposter_word = m.group(2)
    print(f"Referee generated words: civilian_word: {civilian_word}, imposter_word: {imposter_word}")
    return civilian_word, imposter_word

async def setup_game():
    civilian_word, imposter_word = await generate_words()
    imposters = random.sample(players, 2)
    print(f"Imposters: {imposters}")
    agents = []
    for player in players:
        if player in imposters:
            role = "imposter"
            role_msg = f"You are an imposter. The civilian word is '{civilian_word}'. Your word is '{imposter_word}'."
            memory = f"Role: Imposter\nYour word: {imposter_word}\nCivilian word: {civilian_word}\n"
        else:
            role = "civilian"
            role_msg = f"You are a civilian. Your word is '{civilian_word}'."
            memory = f"Role: Civilian\nYour word: {civilian_word}\n"
        full_system_message = GAME_RULES + "\n" + role_msg
        agent = AssistantAgent(name=player, model_client=model_client, system_message=full_system_message)
        agents.append(agent)
        agent_memories[player] = memory
        referee_memory["roles"][player] = role
        print(f"Agent {player} initialized with role: {role} and memory: {memory}")
    agents.append(referee)
    return agents, civilian_word, imposter_word

async def run_round(agents, referee, civilian_word, imposter_word, referee_memory):
    round_counter['day'] += 1
    round_num = round_counter['day']
    print(f"\n🔆 ROUND {round_num} DISCUSSION")
    discussion_context = f"Round {round_num} Discussion\nRemaining Players: {[a.name for a in agents if a.name != 'Referee']}\n"
    live_names = [a.name for a in agents if a.name != "Referee"]
    round_log = []

    for agent in agents:
        if agent.name == "Referee":
            continue
        agent_memories[agent.name] += f"\n[Round {round_num} Start]\nRemaining players: {live_names}\n"
        speech_prompt = (
            f"Round {round_num} starting.\nYour memory:\n{agent_memories[agent.name]}\n"
            "Generate a short internal thought (2 sentences max) about your strategy."
            " Then output a public speech (1 sentence) starting with '**public speech**:'."
        )
        response = await agent.run(task=speech_prompt)
        full = response.messages[-1].content.strip()
        round_log.append(f"{agent.name} FULL RESPONSE:\n{full}\n")
        match = re.search(r"\*\*public speech\*\*:\s*(.+)", full, re.IGNORECASE)
        speech = match.group(1).strip() if match else "(no public speech found)"
        print(f"{agent.name} (speech): {speech}\n")
        discussion_context += f"{agent.name}: {speech}\n"
    
    with open("imposter.txt", "a") as f:
        f.write(f"\n===== ROUND {round_num} DISCUSSION =====\n")
        f.writelines(round_log)

    review_prompt = (
        f"Discussion:\n{discussion_context}\n\nCivilian word: {civilian_word}\nImposter word: {imposter_word}\n"
        "List anyone who said their word or gave false info (comma-separated), or 'none'."
    )
    review_response = await referee.run(task=review_prompt)
    eliminated_by_ref = []
    if "none" not in review_response.messages[-1].content.lower():
        eliminated_by_ref = [p.strip() for p in review_response.messages[-1].content.split(",") if p.strip()]

    print("\n🗳️ VOTING ROUND")
    votes = ""
    vote_logs = []
    for agent in agents:
        agent_memories[agent.name] += f"previous discussion: {discussion_context}\n"
        if agent.name == "Referee" or agent.name in eliminated_by_ref:
            continue
        vote_prompt = f"Round {round_num}. Your memory:\n{agent_memories[agent.name]}\nBaed on your role and previous discussion, Generate a internal thinking process for each player, and what you strategy you should take in voting. Vote with: 'I vote Player X' and justify."
        response = await agent.run(task=vote_prompt)
        vote = response.messages[-1].content.strip()
        print(f"{agent.name} (vote): {vote}\n")
        vote_logs.append(f"{agent.name} VOTE RESPONSE:\n{vote}\n")
        votes += f"{agent.name}: {vote}\n"
        agent_memories[agent.name] += f"\nYour Vote: {vote}\n"

    with open("imposter.txt", "a") as f:
        f.write(f"\n===== ROUND {round_num} VOTES =====\n")
        f.writelines(vote_logs)

    tally_prompt = f"Here are the votes:\n{votes}\nName the player to eliminate. Respond with only the name. remember to return plyaer_2 instead of player 2"
    response = await referee.run(task=tally_prompt)
    eliminated_by_vote = response.messages[-1].content.strip()

    eliminated_all = set(eliminated_by_ref)
    if eliminated_by_vote:
        eliminated_all.add(eliminated_by_vote)

    eliminated_announcement = ""
    for elim in eliminated_all:
        role = referee_memory['roles'][elim]
        eliminated_announcement += f"Player {elim} was eliminated in Round {round_num} and was a {role}.\n"
        for agent in agents:
            agent_memories[agent.name] += f"\nPlayer {elim} was eliminated in Round {round_num} and was a {role}.\n"
    print(eliminated_announcement)
    updated_agents = [a for a in agents if a.name not in eliminated_all]
    updated_roles = {a.name: referee_memory["roles"][a.name] for a in updated_agents if a.name != "Referee"}
    imposters_left = sum(1 for r in updated_roles.values() if r == "imposter")
    civilians_left = sum(1 for r in updated_roles.values() if r == "civilian")
    game_result = None
    if imposters_left == 0:
        game_result = "🎉 Civilians win!"
    elif imposters_left >= civilians_left:
        game_result = "🕵️ Imposters win!"

    with open("imposter.txt", "a") as f:
        f.write("\n===== ROUND SUMMARY =====\n")
        f.write(eliminated_announcement + f"Remaining: {list(updated_roles.keys())}\n")

    return updated_agents + [referee], eliminated_all, game_result

if __name__ == "__main__":
    agents, civilian_word, imposter_word = asyncio.run(setup_game())
    live_agents = agents[:5] + [referee]
    game_result = None

    while not game_result:
        live_agents, eliminated, game_result = asyncio.run(
            run_round(live_agents, referee, civilian_word, imposter_word, referee_memory)
        )
        print(f"\n🧹 Eliminated this round: {eliminated}")
        print(f"🧍 Remaining players: {[a.name for a in live_agents if a.name != 'Referee']}")
        if game_result:
            print(f"\n🎯 Game Over: {game_result}")

    










